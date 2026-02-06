"""
Unit tests for ICP Analyzer class and main functions.

Tests:
- ICPAnalyzer class methods
- analyze_icp_style function
- analyze_icp_compatibility function
- get_icp_questions function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestICPAnalyzer:
    """Tests for ICPAnalyzer class."""

    def test_analyzer_instantiation(self):
        """Test ICPAnalyzer can be instantiated."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()
        assert analyzer is not None

    def test_analyzer_has_data_dir(self):
        """Test analyzer sets up data directory."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()
        assert analyzer.data_dir is not None

    def test_analyze_from_saju_empty_data(self):
        """Test analyzing empty saju data."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()
        result = analyzer.analyze_from_saju({})

        assert 'primary_style' in result
        assert 'octant_scores' in result
        assert result['source'] == 'saju'

    def test_analyze_from_saju_with_sibsin(self):
        """Test analyzing saju data with sibsin."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        saju_data = {
            'sibsin': {
                '비견': {'count': 2},
                '정관': {'count': 1}
            }
        }
        result = analyzer.analyze_from_saju(saju_data)

        assert result['primary_style'] is not None
        assert result['octant_scores']['PA'] > 0  # 비견 maps to PA

    def test_analyze_from_saju_with_ten_gods(self):
        """Test analyzing saju data with ten_gods key."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        saju_data = {
            'ten_gods': {
                '식신': {'count': 2}
            }
        }
        result = analyzer.analyze_from_saju(saju_data)

        assert result['primary_style'] is not None
        assert result['octant_scores']['LM'] > 0  # 식신 maps to LM

    def test_analyze_from_saju_with_pillars(self):
        """Test analyzing saju data with pillars structure."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        saju_data = {
            'pillars': {
                'year': {'sibsin': '정인'},
                'month': {'sibsin': '편관'}
            }
        }
        result = analyzer.analyze_from_saju(saju_data)

        assert 'primary_style' in result
        assert 'octant_scores' in result

    def test_analyze_from_astro_empty_data(self):
        """Test analyzing empty astro data."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()
        result = analyzer.analyze_from_astro({})

        assert 'primary_style' in result
        assert 'octant_scores' in result
        assert result['source'] == 'astrology'

    def test_analyze_from_astro_with_planets(self):
        """Test analyzing astro data with planets."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        astro_data = {
            'planets': {
                'sun': {'sign': 'leo'},
                'moon': {'sign': 'cancer'}
            }
        }
        result = analyzer.analyze_from_astro(astro_data)

        assert result['primary_style'] is not None
        assert result['octant_scores']['PA'] > 0  # sun maps to PA

    def test_analyze_from_astro_with_planet_list(self):
        """Test analyzing astro data with planets as list."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        astro_data = {
            'planets': [
                {'name': 'sun', 'sign': 'aries'},
                {'name': 'moon', 'sign': 'taurus'}
            ]
        }
        result = analyzer.analyze_from_astro(astro_data)

        assert result['primary_style'] is not None

    def test_analyze_from_astro_with_sun_sign(self):
        """Test analyzing astro data with sun_sign."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        astro_data = {
            'sun_sign': 'leo'
        }
        result = analyzer.analyze_from_astro(astro_data)

        assert result['octant_scores']['PA'] > 0  # Leo maps to PA

    def test_analyze_from_astro_with_moon_sign(self):
        """Test analyzing astro data with moon_sign."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        astro_data = {
            'moon_sign': 'cancer'
        }
        result = analyzer.analyze_from_astro(astro_data)

        assert result['octant_scores']['LM'] > 0  # Cancer maps to LM

    def test_analyze_combined_both_sources(self):
        """Test combined analysis with both saju and astro."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        saju_data = {'sibsin': {'비견': {'count': 2}}}
        astro_data = {'sun_sign': 'leo'}

        result = analyzer.analyze_combined(saju_data, astro_data)

        assert 'primary_style' in result
        assert 'dominance_score' in result
        assert 'affiliation_score' in result
        assert 'saju' in result['sources']
        assert 'astrology' in result['sources']

    def test_analyze_combined_saju_only(self):
        """Test combined analysis with saju only."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        saju_data = {'sibsin': {'정관': {'count': 1}}}

        result = analyzer.analyze_combined(saju_data, None)

        assert result['sources'] == ['saju']

    def test_analyze_combined_astro_only(self):
        """Test combined analysis with astro only."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        astro_data = {'sun_sign': 'aries'}

        result = analyzer.analyze_combined(None, astro_data)

        assert result['sources'] == ['astrology']

    def test_get_compatibility_known_pair(self):
        """Test getting compatibility for known pair."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        result = analyzer.get_compatibility('PA', 'PA')

        assert 'score' in result
        assert 'dynamic' in result
        assert 'advice' in result
        assert result['person1_style'] == 'PA'
        assert result['person2_style'] == 'PA'

    def test_get_compatibility_reversed_pair(self):
        """Test compatibility works with reversed pair order."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        result1 = analyzer.get_compatibility('PA', 'HI')
        result2 = analyzer.get_compatibility('HI', 'PA')

        assert result1['score'] == result2['score']

    def test_get_compatibility_unknown_pair(self):
        """Test compatibility for unknown pair returns default."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        # Use a pair that might not be explicitly defined
        result = analyzer.get_compatibility('PA', 'DE')

        assert 'score' in result
        assert result['score'] >= 0

    def test_get_therapeutic_questions(self):
        """Test getting therapeutic questions for a style."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        questions = analyzer.get_therapeutic_questions('PA')

        assert isinstance(questions, list)
        assert len(questions) > 0

    def test_get_therapeutic_questions_fallback(self):
        """Test therapeutic questions fallback for unknown style."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        questions = analyzer.get_therapeutic_questions('XX')

        assert isinstance(questions, list)
        assert len(questions) == 3  # Fallback has 3 questions

    def test_get_growth_recommendations(self):
        """Test getting growth recommendations."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        recs = analyzer.get_growth_recommendations('PA')

        assert 'develop' in recs
        assert 'balance' in recs
        assert 'exercises' in recs

    def test_get_growth_recommendations_fallback(self):
        """Test growth recommendations fallback."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        analyzer = ICPAnalyzer()

        recs = analyzer.get_growth_recommendations('XX')

        assert 'develop' in recs
        assert 'exercises' in recs


class TestAnalyzeICPStyle:
    """Tests for analyze_icp_style function."""

    def test_analyze_icp_style_success(self):
        """Test successful ICP style analysis."""
        from backend_ai.app.icp_logic import analyze_icp_style

        result = analyze_icp_style(
            saju_data={'sibsin': {'비견': {'count': 1}}},
            astro_data={'sun_sign': 'leo'}
        )

        assert result['status'] == 'success'
        assert 'analysis' in result
        assert 'therapeutic_questions' in result['analysis']
        assert 'growth_recommendations' in result['analysis']

    def test_analyze_icp_style_empty_data(self):
        """Test ICP style analysis with empty data."""
        from backend_ai.app.icp_logic import analyze_icp_style

        result = analyze_icp_style()

        assert result['status'] == 'success'

    def test_analyze_icp_style_with_locale(self):
        """Test ICP style analysis with locale."""
        from backend_ai.app.icp_logic import analyze_icp_style

        result = analyze_icp_style(locale='en')

        assert result['status'] == 'success'


class TestAnalyzeICPCompatibility:
    """Tests for analyze_icp_compatibility function."""

    def test_analyze_icp_compatibility_success(self):
        """Test successful ICP compatibility analysis."""
        from backend_ai.app.icp_logic import analyze_icp_compatibility

        result = analyze_icp_compatibility(
            person1_saju={'sibsin': {'비견': {'count': 1}}},
            person1_astro={'sun_sign': 'leo'},
            person2_saju={'sibsin': {'식신': {'count': 1}}},
            person2_astro={'sun_sign': 'cancer'}
        )

        assert result['status'] == 'success'
        assert 'person1_profile' in result
        assert 'person2_profile' in result
        assert 'compatibility' in result

    def test_analyze_icp_compatibility_empty_data(self):
        """Test ICP compatibility with empty data."""
        from backend_ai.app.icp_logic import analyze_icp_compatibility

        result = analyze_icp_compatibility()

        assert result['status'] == 'success'


class TestGetICPQuestions:
    """Tests for get_icp_questions function."""

    def test_get_icp_questions_success(self):
        """Test getting ICP questions."""
        from backend_ai.app.icp_logic import get_icp_questions

        result = get_icp_questions('PA')

        assert result['status'] == 'success'
        assert result['style'] == 'PA'
        assert 'style_info' in result
        assert 'questions' in result
        assert 'growth' in result

    def test_get_icp_questions_with_locale(self):
        """Test getting ICP questions with locale."""
        from backend_ai.app.icp_logic import get_icp_questions

        result = get_icp_questions('LM', locale='en')

        assert result['status'] == 'success'


class TestICPCompatibilityMatrix:
    """Tests for ICP_COMPATIBILITY matrix."""

    def test_compatibility_has_same_octant_entries(self):
        """Test same-octant compatibility entries exist."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        same_pairs = [('PA', 'PA'), ('BC', 'BC'), ('LM', 'LM')]
        for pair in same_pairs:
            assert pair in ICP_COMPATIBILITY

    def test_compatibility_scores_in_range(self):
        """Test all compatibility scores are in valid range."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        for pair, info in ICP_COMPATIBILITY.items():
            assert 0 <= info['score'] <= 100

    def test_compatibility_has_required_fields(self):
        """Test all compatibility entries have required fields."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        for pair, info in ICP_COMPATIBILITY.items():
            assert 'score' in info
            assert 'dynamic' in info
            assert 'advice' in info

    def test_complementary_pairs_exist(self):
        """Test complementary pair entries exist."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        complementary_pairs = [('PA', 'HI'), ('DE', 'LM')]
        for pair in complementary_pairs:
            assert pair in ICP_COMPATIBILITY or (pair[1], pair[0]) in ICP_COMPATIBILITY
