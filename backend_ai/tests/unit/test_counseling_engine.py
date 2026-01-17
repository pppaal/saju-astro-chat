"""
Unit tests for Counseling Engine module.

Tests:
- CrisisDetector
- Basic module imports
- Key classes existence
"""
import pytest


class TestCrisisDetector:
    """Tests for CrisisDetector class."""

    def test_crisis_detector_exists(self):
        """CrisisDetector class should exist."""
        from app.counseling_engine import CrisisDetector

        assert CrisisDetector is not None

    def test_crisis_detector_has_keywords(self):
        """CrisisDetector should have HIGH_RISK_KEYWORDS."""
        from app.counseling_engine import CrisisDetector

        assert hasattr(CrisisDetector, 'HIGH_RISK_KEYWORDS')
        assert len(CrisisDetector.HIGH_RISK_KEYWORDS) > 0

    def test_crisis_detector_has_detect_crisis_method(self):
        """CrisisDetector should have detect_crisis classmethod."""
        from app.counseling_engine import CrisisDetector

        assert hasattr(CrisisDetector, 'detect_crisis')
        assert callable(CrisisDetector.detect_crisis)

    def test_crisis_detector_detect_normal_text(self):
        """CrisisDetector should not detect crisis in normal text."""
        from app.counseling_engine import CrisisDetector

        result = CrisisDetector.detect_crisis("오늘 날씨가 좋네요. 좋은 하루 보내세요.")

        # Should return a dict with severity none or low
        assert isinstance(result, dict)
        assert result.get('severity') in ['none', None, 'low'] or result.get('detected') is False

    def test_crisis_detector_severity_levels(self):
        """CrisisDetector should have different severity levels."""
        from app.counseling_engine import CrisisDetector

        # Check that keywords dict has different severity levels
        keywords = CrisisDetector.HIGH_RISK_KEYWORDS
        severities = set()
        for category, data in keywords.items():
            if isinstance(data, dict) and 'severity' in data:
                severities.add(data['severity'])

        # Should have at least one severity level
        assert len(severities) > 0

    def test_crisis_detector_get_crisis_response(self):
        """CrisisDetector should have get_crisis_response classmethod."""
        from app.counseling_engine import CrisisDetector

        assert hasattr(CrisisDetector, 'get_crisis_response')
        assert callable(CrisisDetector.get_crisis_response)


class TestCounselingEngineClasses:
    """Tests for other counseling engine classes."""

    def test_jungian_counseling_engine_exists(self):
        """JungianCounselingEngine class should exist."""
        from app.counseling_engine import JungianCounselingEngine

        assert JungianCounselingEngine is not None

    def test_therapeutic_question_generator_exists(self):
        """TherapeuticQuestionGenerator should exist."""
        from app.counseling_engine import TherapeuticQuestionGenerator

        assert TherapeuticQuestionGenerator is not None

    def test_emotional_message_generator_exists(self):
        """EmotionalMessageGenerator should exist."""
        from app.counseling_engine import EmotionalMessageGenerator

        assert EmotionalMessageGenerator is not None

    def test_jungian_rag_exists(self):
        """JungianRAG should exist."""
        from app.counseling_engine import JungianRAG

        assert JungianRAG is not None

    def test_counseling_session_exists(self):
        """CounselingSession should exist."""
        from app.counseling_engine import CounselingSession

        assert CounselingSession is not None


class TestTherapeuticQuestionGenerator:
    """Tests for TherapeuticQuestionGenerator class."""

    def test_instantiation(self):
        """TherapeuticQuestionGenerator should instantiate."""
        from app.counseling_engine import TherapeuticQuestionGenerator

        generator = TherapeuticQuestionGenerator()
        assert generator is not None

    def test_get_shadow_questions(self):
        """Should have get_shadow_questions method."""
        from app.counseling_engine import TherapeuticQuestionGenerator

        generator = TherapeuticQuestionGenerator()
        assert hasattr(generator, 'get_shadow_questions')

    def test_get_meaning_questions(self):
        """Should have get_meaning_questions method."""
        from app.counseling_engine import TherapeuticQuestionGenerator

        generator = TherapeuticQuestionGenerator()
        assert hasattr(generator, 'get_meaning_questions')


class TestCounselingEngineConstants:
    """Tests for counseling engine constants."""

    def test_openai_availability_flag(self):
        """OPENAI_AVAILABLE flag should be defined."""
        from app.counseling_engine import OPENAI_AVAILABLE

        assert isinstance(OPENAI_AVAILABLE, bool)

    def test_embedding_availability_flag(self):
        """EMBEDDING_AVAILABLE flag should be defined."""
        from app.counseling_engine import EMBEDDING_AVAILABLE

        assert isinstance(EMBEDDING_AVAILABLE, bool)


class TestCounselingEngineModuleImports:
    """Tests for module imports."""

    def test_basic_imports(self):
        """Basic module imports should work."""
        from app.counseling_engine import (
            CrisisDetector,
            JungianCounselingEngine,
            TherapeuticQuestionGenerator,
            EmotionalMessageGenerator,
            JungianRAG,
            CounselingSession,
        )

        assert CrisisDetector is not None
        assert JungianCounselingEngine is not None
        assert TherapeuticQuestionGenerator is not None
        assert EmotionalMessageGenerator is not None
        assert JungianRAG is not None
        assert CounselingSession is not None

    def test_get_jungian_rag_function(self):
        """get_jungian_rag function should exist."""
        from app.counseling_engine import get_jungian_rag

        assert callable(get_jungian_rag)
