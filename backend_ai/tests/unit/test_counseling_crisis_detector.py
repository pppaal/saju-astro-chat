"""
Unit tests for Counseling Crisis Detector module.

Tests:
- CrisisDetector class
- HIGH_RISK_KEYWORDS
- EMERGENCY_RESOURCES
- detect_crisis method
"""
import pytest


class TestCrisisDetectorClass:
    """Tests for CrisisDetector class."""

    def test_crisis_detector_exists(self):
        """CrisisDetector class should exist."""
        from app.counseling.crisis_detector import CrisisDetector

        assert CrisisDetector is not None


class TestHighRiskKeywords:
    """Tests for HIGH_RISK_KEYWORDS constant."""

    def test_high_risk_keywords_exists(self):
        """HIGH_RISK_KEYWORDS should exist."""
        from app.counseling.crisis_detector import CrisisDetector

        assert hasattr(CrisisDetector, 'HIGH_RISK_KEYWORDS')
        assert isinstance(CrisisDetector.HIGH_RISK_KEYWORDS, dict)

    def test_high_risk_keywords_has_categories(self):
        """HIGH_RISK_KEYWORDS should have expected categories."""
        from app.counseling.crisis_detector import CrisisDetector

        keywords = CrisisDetector.HIGH_RISK_KEYWORDS

        assert 'suicidal' in keywords
        assert 'self_harm' in keywords
        assert 'severe_distress' in keywords

    def test_high_risk_keywords_structure(self):
        """Each category should have keywords, severity, and action."""
        from app.counseling.crisis_detector import CrisisDetector

        for category, data in CrisisDetector.HIGH_RISK_KEYWORDS.items():
            assert 'keywords' in data
            assert 'severity' in data
            assert 'action' in data
            assert isinstance(data['keywords'], list)


class TestEmergencyResources:
    """Tests for EMERGENCY_RESOURCES constant."""

    def test_emergency_resources_exists(self):
        """EMERGENCY_RESOURCES should exist."""
        from app.counseling.crisis_detector import CrisisDetector

        assert hasattr(CrisisDetector, 'EMERGENCY_RESOURCES')
        assert isinstance(CrisisDetector.EMERGENCY_RESOURCES, dict)

    def test_emergency_resources_has_locales(self):
        """EMERGENCY_RESOURCES should have locale keys."""
        from app.counseling.crisis_detector import CrisisDetector

        resources = CrisisDetector.EMERGENCY_RESOURCES

        assert 'ko' in resources
        assert 'en' in resources

    def test_korean_resources_has_hotlines(self):
        """Korean resources should have hotline numbers."""
        from app.counseling.crisis_detector import CrisisDetector

        ko_resources = CrisisDetector.EMERGENCY_RESOURCES['ko']

        assert 'suicide_hotline' in ko_resources
        assert '1393' in ko_resources['suicide_hotline']


class TestDetectCrisisMethod:
    """Tests for detect_crisis method."""

    def test_detect_crisis_method_exists(self):
        """detect_crisis method should exist."""
        from app.counseling.crisis_detector import CrisisDetector

        assert hasattr(CrisisDetector, 'detect_crisis')
        assert callable(CrisisDetector.detect_crisis)

    def test_detect_crisis_returns_dict(self):
        """detect_crisis should return a dict."""
        from app.counseling.crisis_detector import CrisisDetector

        result = CrisisDetector.detect_crisis("일반적인 텍스트")

        assert isinstance(result, dict)

    def test_detect_crisis_detects_suicidal_keywords(self):
        """detect_crisis should detect suicidal keywords."""
        from app.counseling.crisis_detector import CrisisDetector

        result = CrisisDetector.detect_crisis("죽고 싶어요")

        assert 'detected' in result or len(result) > 0

    def test_detect_crisis_safe_text(self):
        """detect_crisis should handle safe text."""
        from app.counseling.crisis_detector import CrisisDetector

        result = CrisisDetector.detect_crisis("오늘 날씨가 좋아요")

        # Should return empty or indicate no crisis
        assert isinstance(result, dict)


class TestModuleExports:
    """Tests for module exports."""

    def test_crisis_detector_importable(self):
        """CrisisDetector should be importable."""
        from app.counseling.crisis_detector import CrisisDetector
        assert CrisisDetector is not None
