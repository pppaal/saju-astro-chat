"""
Unit tests for ICP (Interpersonal Circumplex) Logic module.

Tests:
- ICP octant definitions
- Saju sibsin to ICP mapping
- Planet and sign to ICP mapping
- Compatibility analysis
"""
import pytest
from unittest.mock import patch, MagicMock


class TestICPOctants:
    """Tests for ICP_OCTANTS constant."""

    def test_all_octants_defined(self):
        """Test all 8 octants are defined."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        expected_octants = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
        for octant in expected_octants:
            assert octant in ICP_OCTANTS

    def test_octant_has_name(self):
        """Test each octant has a name."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'name' in octant
            assert isinstance(octant['name'], str)
            assert len(octant['name']) > 0

    def test_octant_has_korean(self):
        """Test each octant has Korean translation."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'korean' in octant
            assert isinstance(octant['korean'], str)

    def test_octant_has_dominance(self):
        """Test each octant has dominance value."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'dominance' in octant
            assert -1.0 <= octant['dominance'] <= 1.0

    def test_octant_has_affiliation(self):
        """Test each octant has affiliation value."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'affiliation' in octant
            assert -1.0 <= octant['affiliation'] <= 1.0

    def test_octant_has_traits(self):
        """Test each octant has traits list."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'traits' in octant
            assert isinstance(octant['traits'], list)
            assert len(octant['traits']) > 0

    def test_octant_has_shadow(self):
        """Test each octant has shadow aspect."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        for code, octant in ICP_OCTANTS.items():
            assert 'shadow' in octant
            assert isinstance(octant['shadow'], str)

    def test_pa_is_dominant(self):
        """Test PA octant is high dominance."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        assert ICP_OCTANTS['PA']['dominance'] == 1.0

    def test_hi_is_submissive(self):
        """Test HI octant is low dominance."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        assert ICP_OCTANTS['HI']['dominance'] == -1.0

    def test_lm_is_affiliative(self):
        """Test LM octant is high affiliation."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        assert ICP_OCTANTS['LM']['affiliation'] == 1.0

    def test_de_is_hostile(self):
        """Test DE octant is low affiliation."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        assert ICP_OCTANTS['DE']['affiliation'] == -1.0


class TestSibsinToICPMapping:
    """Tests for SIBSIN_TO_ICP mapping."""

    def test_all_sibsin_mapped(self):
        """Test all 10 sibsin types are mapped."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        expected_sibsin = [
            '비견', '겁재',  # 비겁
            '식신', '상관',  # 식상
            '편재', '정재',  # 재성
            '편관', '정관',  # 관성
            '편인', '정인'   # 인성
        ]
        for sibsin in expected_sibsin:
            assert sibsin in SIBSIN_TO_ICP

    def test_mapping_has_primary(self):
        """Test each mapping has primary octant."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP, ICP_OCTANTS

        for sibsin, mapping in SIBSIN_TO_ICP.items():
            assert 'primary' in mapping
            assert mapping['primary'] in ICP_OCTANTS

    def test_mapping_has_secondary(self):
        """Test each mapping has secondary octant."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP, ICP_OCTANTS

        for sibsin, mapping in SIBSIN_TO_ICP.items():
            assert 'secondary' in mapping
            assert mapping['secondary'] in ICP_OCTANTS

    def test_mapping_has_weight(self):
        """Test each mapping has weight value."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        for sibsin, mapping in SIBSIN_TO_ICP.items():
            assert 'weight' in mapping
            assert 0 < mapping['weight'] <= 1.0

    def test_bigyeon_maps_to_pa(self):
        """Test 비견 maps to PA (dominant)."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        assert SIBSIN_TO_ICP['비견']['primary'] == 'PA'

    def test_siksin_maps_to_lm(self):
        """Test 식신 maps to LM (warm)."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP

        assert SIBSIN_TO_ICP['식신']['primary'] == 'LM'


class TestPlanetToICPMapping:
    """Tests for PLANET_TO_ICP mapping."""

    def test_major_planets_mapped(self):
        """Test major planets are mapped."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        planets = ['sun', 'moon', 'mercury', 'venus', 'mars',
                   'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
        for planet in planets:
            assert planet in PLANET_TO_ICP

    def test_planet_mapping_structure(self):
        """Test planet mapping has correct structure."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP, ICP_OCTANTS

        for planet, mapping in PLANET_TO_ICP.items():
            assert 'primary' in mapping
            assert 'secondary' in mapping
            assert 'weight' in mapping
            assert mapping['primary'] in ICP_OCTANTS
            assert mapping['secondary'] in ICP_OCTANTS

    def test_sun_maps_to_pa(self):
        """Test sun maps to PA (dominant leader)."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        assert PLANET_TO_ICP['sun']['primary'] == 'PA'

    def test_moon_maps_to_lm(self):
        """Test moon maps to LM (nurturing)."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        assert PLANET_TO_ICP['moon']['primary'] == 'LM'

    def test_mars_maps_to_bc(self):
        """Test mars maps to BC (competitive)."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP

        assert PLANET_TO_ICP['mars']['primary'] == 'BC'


class TestSignToICPMapping:
    """Tests for SIGN_TO_ICP mapping."""

    def test_all_zodiac_signs_mapped(self):
        """Test all 12 zodiac signs are mapped."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP

        signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
        for sign in signs:
            assert sign in SIGN_TO_ICP

    def test_sign_mapping_structure(self):
        """Test sign mapping has correct structure."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP, ICP_OCTANTS

        for sign, mapping in SIGN_TO_ICP.items():
            assert 'primary' in mapping
            assert 'secondary' in mapping
            assert mapping['primary'] in ICP_OCTANTS
            assert mapping['secondary'] in ICP_OCTANTS

    def test_aries_maps_to_pa(self):
        """Test Aries maps to PA (assertive)."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP

        assert SIGN_TO_ICP['aries']['primary'] == 'PA'

    def test_cancer_maps_to_lm(self):
        """Test Cancer maps to LM (nurturing)."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP

        assert SIGN_TO_ICP['cancer']['primary'] == 'LM'

    def test_virgo_maps_to_de(self):
        """Test Virgo maps to DE (analytical)."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP

        assert SIGN_TO_ICP['virgo']['primary'] == 'DE'


class TestICPModuleExports:
    """Tests for module exports."""

    def test_icp_octants_importable(self):
        """ICP_OCTANTS should be importable."""
        from backend_ai.app.icp_logic import ICP_OCTANTS
        assert ICP_OCTANTS is not None

    def test_sibsin_to_icp_importable(self):
        """SIBSIN_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import SIBSIN_TO_ICP
        assert SIBSIN_TO_ICP is not None

    def test_planet_to_icp_importable(self):
        """PLANET_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import PLANET_TO_ICP
        assert PLANET_TO_ICP is not None

    def test_sign_to_icp_importable(self):
        """SIGN_TO_ICP should be importable."""
        from backend_ai.app.icp_logic import SIGN_TO_ICP
        assert SIGN_TO_ICP is not None


class TestICPOctantGeometry:
    """Tests for ICP octant geometric properties."""

    def test_octants_cover_circumplex(self):
        """Test octants properly cover the ICP circumplex."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        # Check we have octants in all four quadrants
        high_dom_high_aff = [k for k, v in ICP_OCTANTS.items()
                            if v['dominance'] > 0 and v['affiliation'] > 0]
        high_dom_low_aff = [k for k, v in ICP_OCTANTS.items()
                           if v['dominance'] > 0 and v['affiliation'] < 0]
        low_dom_high_aff = [k for k, v in ICP_OCTANTS.items()
                           if v['dominance'] < 0 and v['affiliation'] > 0]
        low_dom_low_aff = [k for k, v in ICP_OCTANTS.items()
                          if v['dominance'] < 0 and v['affiliation'] < 0]

        assert len(high_dom_high_aff) >= 1  # NO
        assert len(high_dom_low_aff) >= 1   # BC
        assert len(low_dom_high_aff) >= 1   # JK
        assert len(low_dom_low_aff) >= 1    # FG

    def test_opposite_octants_have_opposite_values(self):
        """Test opposing octants have contrasting values."""
        from backend_ai.app.icp_logic import ICP_OCTANTS

        # PA (dominant) vs HI (submissive)
        assert ICP_OCTANTS['PA']['dominance'] > ICP_OCTANTS['HI']['dominance']

        # LM (affiliative) vs DE (cold)
        assert ICP_OCTANTS['LM']['affiliation'] > ICP_OCTANTS['DE']['affiliation']
