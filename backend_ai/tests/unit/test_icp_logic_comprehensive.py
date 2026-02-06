"""
Unit tests for backend_ai/app/icp_logic.py

Tests:
- ICP_OCTANTS constants
- SIBSIN_TO_ICP mapping
- PLANET_TO_ICP mapping
- ICP_COMPATIBILITY matrix
- ICPAnalyzer class
- analyze_from_saju
- analyze_from_astro
"""
import pytest


class TestICPOctantsConstants:
    """Tests for ICP_OCTANTS constants."""

    def test_all_octants_defined(self):
        """All 8 octants should be defined."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        expected = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
        for octant in expected:
            assert octant in ICP_OCTANTS

    def test_octant_structure(self):
        """Each octant should have required fields."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for octant_id, octant_data in ICP_OCTANTS.items():
            assert 'name' in octant_data
            assert 'korean' in octant_data
            assert 'dominance' in octant_data
            assert 'affiliation' in octant_data
            assert 'traits' in octant_data
            assert 'shadow' in octant_data

    def test_dominance_affiliation_range(self):
        """Dominance and affiliation should be in [-1, 1]."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for octant_id, octant_data in ICP_OCTANTS.items():
            assert -1.0 <= octant_data['dominance'] <= 1.0
            assert -1.0 <= octant_data['affiliation'] <= 1.0


class TestSibsinToICPMapping:
    """Tests for SIBSIN_TO_ICP mapping."""

    def test_all_sibsin_mapped(self):
        """All 10 sibsin should be mapped."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        expected_sibsin = [
            '비견', '겁재', '식신', '상관',
            '편재', '정재', '편관', '정관',
            '편인', '정인'
        ]
        for sibsin in expected_sibsin:
            assert sibsin in SIBSIN_TO_ICP

    def test_sibsin_mapping_structure(self):
        """Each mapping should have primary, secondary, weight."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        for sibsin, mapping in SIBSIN_TO_ICP.items():
            assert 'primary' in mapping
            assert 'secondary' in mapping
            assert 'weight' in mapping
            assert 0 < mapping['weight'] <= 1.0

    def test_sibsin_primary_is_valid_octant(self):
        """Primary mapping should be valid octant."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP, ICP_OCTANTS

        for sibsin, mapping in SIBSIN_TO_ICP.items():
            assert mapping['primary'] in ICP_OCTANTS
            assert mapping['secondary'] in ICP_OCTANTS


class TestPlanetToICPMapping:
    """Tests for PLANET_TO_ICP mapping."""

    def test_major_planets_mapped(self):
        """Major planets should be mapped."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        expected_planets = [
            'sun', 'moon', 'mercury', 'venus', 'mars',
            'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
        ]
        for planet in expected_planets:
            assert planet in PLANET_TO_ICP

    def test_planet_mapping_structure(self):
        """Each planet mapping should have required fields."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        for planet, mapping in PLANET_TO_ICP.items():
            assert 'primary' in mapping
            assert 'secondary' in mapping
            assert 'weight' in mapping


class TestSignToICPMapping:
    """Tests for SIGN_TO_ICP mapping."""

    def test_all_signs_mapped(self):
        """All 12 zodiac signs should be mapped."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP

        expected_signs = [
            'aries', 'taurus', 'gemini', 'cancer',
            'leo', 'virgo', 'libra', 'scorpio',
            'sagittarius', 'capricorn', 'aquarius', 'pisces'
        ]
        for sign in expected_signs:
            assert sign in SIGN_TO_ICP


class TestICPCompatibility:
    """Tests for ICP_COMPATIBILITY matrix."""

    def test_compatibility_structure(self):
        """Compatibility entries should have required fields."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        for pair, compat in ICP_COMPATIBILITY.items():
            assert 'score' in compat
            assert 'dynamic' in compat
            assert 'advice' in compat

    def test_compatibility_score_range(self):
        """Compatibility scores should be in [0, 100]."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        for pair, compat in ICP_COMPATIBILITY.items():
            assert 0 <= compat['score'] <= 100

    def test_same_octant_pairs(self):
        """Same octant pairs should exist."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY

        same_pairs = [
            ('PA', 'PA'), ('BC', 'BC'), ('DE', 'DE'), ('FG', 'FG'),
            ('HI', 'HI'), ('JK', 'JK'), ('LM', 'LM'), ('NO', 'NO')
        ]
        for pair in same_pairs:
            assert pair in ICP_COMPATIBILITY


class TestICPAnalyzerInit:
    """Tests for ICPAnalyzer initialization."""

    def test_create_analyzer(self):
        """Should create ICPAnalyzer instance."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        assert analyzer is not None

    def test_analyzer_has_data_dir(self):
        """Analyzer should have data directory."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        assert analyzer.data_dir is not None


class TestAnalyzeFromSaju:
    """Tests for analyze_from_saju method."""

    def test_analyze_empty_saju(self):
        """Should handle empty saju data."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        result = analyzer.analyze_from_saju({})

        assert 'primary_style' in result
        assert 'octant_scores' in result
        assert result['source'] == 'saju'

    def test_analyze_with_sibsin_data(self):
        """Should analyze saju with sibsin data."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        saju_data = {
            'sibsin': {
                '비견': {'count': 2},
                '정관': {'count': 1},
                '정인': {'count': 1}
            }
        }

        result = analyzer.analyze_from_saju(saju_data)

        assert result['primary_style'] in ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
        assert 'octant_scores' in result

    def test_analyze_with_ten_gods(self):
        """Should handle ten_gods format."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        saju_data = {
            'ten_gods': {
                '편관': 2,
                '식신': 1
            }
        }

        result = analyzer.analyze_from_saju(saju_data)
        assert 'primary_style' in result

    def test_scores_normalized(self):
        """Octant scores should be normalized to [0, 1]."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        saju_data = {
            'sibsin': {
                '비견': 3,
                '정인': 2,
                '편관': 1
            }
        }

        result = analyzer.analyze_from_saju(saju_data)
        scores = result['octant_scores']

        for octant, score in scores.items():
            assert 0 <= score <= 1.0


class TestAnalyzeFromAstro:
    """Tests for analyze_from_astro method."""

    def test_analyze_empty_astro(self):
        """Should handle empty astro data."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        result = analyzer.analyze_from_astro({})

        assert 'primary_style' in result
        assert 'octant_scores' in result
        assert result['source'] == 'astrology'

    def test_analyze_with_planet_dict(self):
        """Should analyze astro with planet dict format."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        astro_data = {
            'planets': {
                'sun': {'sign': 'leo'},
                'moon': {'sign': 'cancer'},
                'mars': {'sign': 'aries'}
            }
        }

        result = analyzer.analyze_from_astro(astro_data)
        assert result['primary_style'] in ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']

    def test_analyze_with_planet_list(self):
        """Should handle planet list format."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        astro_data = {
            'planets': [
                {'name': 'sun', 'sign': 'aries'},
                {'name': 'moon', 'sign': 'taurus'}
            ]
        }

        result = analyzer.analyze_from_astro(astro_data)
        assert 'primary_style' in result

    def test_sun_sign_weighting(self):
        """Sun sign should have extra weight."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        astro_data = {
            'sun_sign': 'leo',
            'planets': {
                'sun': {'sign': 'leo'}
            }
        }

        result = analyzer.analyze_from_astro(astro_data)
        # Leo maps to PA primarily
        assert result['octant_scores']['PA'] > 0


class TestICPAnalyzerIntegration:
    """Integration tests for ICPAnalyzer."""

    def test_combined_analysis(self):
        """Should provide combined saju+astro analysis."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()

        saju_data = {
            'sibsin': {'비견': 2, '정관': 1}
        }
        astro_data = {
            'planets': {'sun': {'sign': 'aries'}}
        }

        saju_result = analyzer.analyze_from_saju(saju_data)
        astro_result = analyzer.analyze_from_astro(astro_data)

        assert saju_result['source'] == 'saju'
        assert astro_result['source'] == 'astrology'

    def test_primary_info_included(self):
        """Result should include primary_info details."""
        from backend_ai.app.icp_logic import ICPAnalyzer

        analyzer = ICPAnalyzer()
        result = analyzer.analyze_from_saju({
            'sibsin': {'비견': 2}
        })

        assert 'primary_info' in result
        if result['primary_info']:
            assert 'name' in result['primary_info']
            assert 'korean' in result['primary_info']


class TestModuleExports:
    """Tests for module exports."""

    def test_icp_octants_importable(self):
        """ICP_OCTANTS should be importable."""
        from backend_ai.app.icp_logic import ICP_OCTANTS
        assert isinstance(ICP_OCTANTS, dict)

    def test_sibsin_to_icp_importable(self):
        """SIBSIN_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP
        assert isinstance(SIBSIN_TO_ICP, dict)

    def test_planet_to_icp_importable(self):
        """PLANET_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP
        assert isinstance(PLANET_TO_ICP, dict)

    def test_sign_to_icp_importable(self):
        """SIGN_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP
        assert isinstance(SIGN_TO_ICP, dict)

    def test_icp_compatibility_importable(self):
        """ICP_COMPATIBILITY should be importable."""
        from backend_ai.app.icp_logic import ICP_COMPATIBILITY
        assert isinstance(ICP_COMPATIBILITY, dict)

    def test_icp_analyzer_importable(self):
        """ICPAnalyzer should be importable."""
        from backend_ai.app.icp_logic import ICPAnalyzer
        assert callable(ICPAnalyzer)

