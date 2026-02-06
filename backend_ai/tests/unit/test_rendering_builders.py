"""
Unit tests for Rendering Builders module.

Tests:
- build_saju_analysis function
- build_astro_analysis function
- build_cross_insight function
- get_category_analysis function
- get_category_keywords function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestBuildSajuAnalysis:
    """Tests for build_saju_analysis function."""

    def test_build_saju_analysis_career_with_officer(self):
        """Test saju analysis for career with officer sibsin."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'has_officer_sibsin': True}
        saju_meta = {'day_master': '甲', 'day_master_element': '목'}

        result = build_saju_analysis('career', saju_data, saju_meta)

        assert isinstance(result, str)
        assert len(result) > 0
        assert "조직" in result or "인정" in result

    def test_build_saju_analysis_career_without_officer(self):
        """Test saju analysis for career without officer sibsin."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'has_officer_sibsin': False}
        saju_meta = {'day_master': '甲', 'day_master_element': '목'}

        result = build_saju_analysis('career', saju_data, saju_meta)

        assert isinstance(result, str)
        assert "자율" in result or "유연" in result or "전문" in result

    def test_build_saju_analysis_wealth_with_wealth_sibsin(self):
        """Test saju analysis for wealth with wealth sibsin."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'has_wealth_sibsin': True}
        saju_meta = {'day_master': '丙', 'day_master_element': '화'}

        result = build_saju_analysis('wealth', saju_data, saju_meta)

        assert "재물" in result or "투자" in result

    def test_build_saju_analysis_wealth_without_wealth_sibsin(self):
        """Test saju analysis for wealth without wealth sibsin."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'has_wealth_sibsin': False}
        saju_meta = {'day_master': '丙', 'day_master_element': '화'}

        result = build_saju_analysis('wealth', saju_data, saju_meta)

        assert "전문" in result or "실력" in result or "꾸준" in result

    def test_build_saju_analysis_love_with_sinsal(self):
        """Test saju analysis for love with sinsal."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'love_sinsal_count': 2}
        saju_meta = {'day_master': '壬', 'day_master_element': '수'}

        result = build_saju_analysis('love', saju_data, saju_meta)

        assert "매력" in result or "이성" in result

    def test_build_saju_analysis_love_without_sinsal(self):
        """Test saju analysis for love without sinsal."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {'love_sinsal_count': 0}
        saju_meta = {'day_master': '壬', 'day_master_element': '수'}

        result = build_saju_analysis('love', saju_data, saju_meta)

        assert "진지" in result or "깊은" in result

    def test_build_saju_analysis_health(self):
        """Test saju analysis for health."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {}
        saju_meta = {'day_master': '甲', 'day_master_element': '목'}

        result = build_saju_analysis('health', saju_data, saju_meta)

        assert "간" in result or "건강" in result

    def test_build_saju_analysis_unknown_category(self):
        """Test saju analysis for unknown category."""
        from backend_ai.app.rendering.builders import build_saju_analysis

        saju_data = {}
        saju_meta = {}

        result = build_saju_analysis('unknown', saju_data, saju_meta)

        assert "정보가 필요" in result


class TestBuildAstroAnalysis:
    """Tests for build_astro_analysis function."""

    def test_build_astro_analysis_career_with_mc_sign(self):
        """Test astro analysis for career with MC sign."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {'mc_sign': 'Aries'}
        astro_meta = {}

        result = build_astro_analysis('career', astro_data, astro_meta)

        assert "양자리" in result
        assert "리더십" in result or "스포츠" in result or "적성" in result

    def test_build_astro_analysis_career_with_planets(self):
        """Test astro analysis for career with planets in career houses."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {
            'mc_sign': 'Leo',
            'planets_in_career_houses': [('Jupiter', 10), 'Saturn']
        }
        astro_meta = {}

        result = build_astro_analysis('career', astro_data, astro_meta)

        assert "커리어" in result or "성장" in result

    def test_build_astro_analysis_career_no_data(self):
        """Test astro analysis for career with no data."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {}
        astro_meta = {}

        result = build_astro_analysis('career', astro_data, astro_meta)

        assert "노력" in result or "네트워킹" in result

    def test_build_astro_analysis_wealth_with_pof(self):
        """Test astro analysis for wealth with POF house."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {'pof_house': 2}
        astro_meta = {}

        result = build_astro_analysis('wealth', astro_data, astro_meta)

        assert "행운 포인트" in result or "수입" in result

    def test_build_astro_analysis_wealth_with_benefics(self):
        """Test astro analysis for wealth with benefics."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {'benefics_in_money_houses': ['Jupiter', 'Venus']}
        astro_meta = {}

        result = build_astro_analysis('wealth', astro_data, astro_meta)

        assert "금전" in result or "행운" in result

    def test_build_astro_analysis_love_with_venus_sign(self):
        """Test astro analysis for love with Venus sign."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {}
        astro_meta = {'venus_sign': 'Libra'}

        result = build_astro_analysis('love', astro_data, astro_meta)

        assert "금성" in result
        assert "천칭자리" in result or "로맨틱" in result

    def test_build_astro_analysis_love_with_planets_in_rel_houses(self):
        """Test astro analysis for love with planets in relationship houses."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {'venus_mars_moon_in_rel_houses': ['Venus', 'Moon']}
        astro_meta = {}

        result = build_astro_analysis('love', astro_data, astro_meta)

        assert "연애" in result or "기회" in result

    def test_build_astro_analysis_health_with_asc_sign(self):
        """Test astro analysis for health with ASC sign."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {}
        astro_meta = {'asc_sign': 'Aries'}

        result = build_astro_analysis('health', astro_data, astro_meta)

        assert "상승궁" in result
        assert "양자리" in result

    def test_build_astro_analysis_health_with_malefics(self):
        """Test astro analysis for health with malefics."""
        from backend_ai.app.rendering.builders import build_astro_analysis

        astro_data = {'malefics_in_health_houses': ['Mars', 'Saturn']}
        astro_meta = {}

        result = build_astro_analysis('health', astro_data, astro_meta)

        assert "건강" in result or "예방" in result


class TestBuildCrossInsight:
    """Tests for build_cross_insight function."""

    def test_build_cross_insight_career_both(self):
        """Test cross insight for career with both signals."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {'has_officer_sibsin': True}
        astro_data = {'mc_sign': 'Leo'}

        result = build_cross_insight('career', saju_data, astro_data)

        assert "조직" in result or "체계" in result

    def test_build_cross_insight_career_officer_only(self):
        """Test cross insight for career with officer only."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {'has_officer_sibsin': True}
        astro_data = {}

        result = build_cross_insight('career', saju_data, astro_data)

        assert "안정" in result or "꾸준" in result

    def test_build_cross_insight_career_mc_only(self):
        """Test cross insight for career with MC only."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {}
        astro_data = {'mc_sign': 'Aquarius'}

        result = build_cross_insight('career', saju_data, astro_data)

        assert "개척" in result or "경험" in result

    def test_build_cross_insight_career_none(self):
        """Test cross insight for career with no signals."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {}
        astro_data = {}

        result = build_cross_insight('career', saju_data, astro_data)

        assert "강점" in result or "무기" in result

    def test_build_cross_insight_wealth_both(self):
        """Test cross insight for wealth with both signals."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {'has_wealth_sibsin': True}
        astro_data = {'pof_house': 8}

        result = build_cross_insight('wealth', saju_data, astro_data)

        assert "재물" in result

    def test_build_cross_insight_love_both(self):
        """Test cross insight for love with both signals."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {'love_sinsal_count': 2}
        astro_data = {'venus_mars_moon_in_rel_houses': ['Venus']}

        result = build_cross_insight('love', saju_data, astro_data)

        assert "만남" in result or "매력" in result or "인연" in result

    def test_build_cross_insight_health_weak_elements(self):
        """Test cross insight for health with weak elements."""
        from backend_ai.app.rendering.builders import build_cross_insight

        saju_data = {'five_element_flags': {'목': 'weak'}}
        astro_data = {'malefics_in_health_houses': ['Mars']}

        result = build_cross_insight('health', saju_data, astro_data)

        assert "건강" in result or "주의" in result

    def test_build_cross_insight_unknown_category(self):
        """Test cross insight for unknown category."""
        from backend_ai.app.rendering.builders import build_cross_insight

        result = build_cross_insight('unknown', {}, {})

        assert "동양" in result or "지혜" in result


class TestGetCategoryAnalysis:
    """Tests for get_category_analysis function."""

    def test_get_category_analysis_returns_dict(self):
        """Test get_category_analysis returns dictionary."""
        from backend_ai.app.rendering.builders import get_category_analysis

        signals = {'saju': {}, 'astro': {'meta': {}}}
        theme_cross = {}

        result = get_category_analysis(signals, theme_cross)

        assert isinstance(result, dict)

    def test_get_category_analysis_has_all_categories(self):
        """Test result has all categories."""
        from backend_ai.app.rendering.builders import get_category_analysis

        signals = {'saju': {}, 'astro': {'meta': {}}}
        theme_cross = {}

        result = get_category_analysis(signals, theme_cross)

        assert 'career' in result
        assert 'wealth' in result
        assert 'love' in result
        assert 'health' in result

    def test_get_category_analysis_category_structure(self):
        """Test each category has required fields."""
        from backend_ai.app.rendering.builders import get_category_analysis

        signals = {'saju': {}, 'astro': {'meta': {}}}
        theme_cross = {}

        result = get_category_analysis(signals, theme_cross)

        for category in ['career', 'wealth', 'love', 'health']:
            assert 'icon' in result[category]
            assert 'title' in result[category]
            assert 'sajuAnalysis' in result[category]
            assert 'astroAnalysis' in result[category]
            assert 'crossInsight' in result[category]

    def test_get_category_analysis_locale_ko(self):
        """Test Korean locale titles."""
        from backend_ai.app.rendering.builders import get_category_analysis

        signals = {'saju': {}, 'astro': {'meta': {}}}
        theme_cross = {}

        result = get_category_analysis(signals, theme_cross, locale='ko')

        assert result['career']['title'] == '커리어'
        assert result['wealth']['title'] == '재물'

    def test_get_category_analysis_locale_en(self):
        """Test English locale titles."""
        from backend_ai.app.rendering.builders import get_category_analysis

        signals = {'saju': {}, 'astro': {'meta': {}}}
        theme_cross = {}

        result = get_category_analysis(signals, theme_cross, locale='en')

        assert result['career']['title'] == 'Career'
        assert result['wealth']['title'] == 'Wealth'

    def test_get_category_analysis_with_empty_signals(self):
        """Test with empty signals."""
        from backend_ai.app.rendering.builders import get_category_analysis

        result = get_category_analysis(None, {})

        assert 'career' in result


class TestGetCategoryKeywords:
    """Tests for get_category_keywords function."""

    def test_get_category_keywords_career(self):
        """Test keywords for career."""
        from backend_ai.app.rendering.builders import get_category_keywords

        keywords = get_category_keywords('career', {}, {})

        assert isinstance(keywords, list)
        assert '승진' in keywords or '이직' in keywords

    def test_get_category_keywords_wealth(self):
        """Test keywords for wealth."""
        from backend_ai.app.rendering.builders import get_category_keywords

        keywords = get_category_keywords('wealth', {}, {})

        assert '재물' in keywords or '투자' in keywords

    def test_get_category_keywords_love(self):
        """Test keywords for love."""
        from backend_ai.app.rendering.builders import get_category_keywords

        keywords = get_category_keywords('love', {}, {})

        assert '인연' in keywords or '관계' in keywords

    def test_get_category_keywords_health(self):
        """Test keywords for health."""
        from backend_ai.app.rendering.builders import get_category_keywords

        keywords = get_category_keywords('health', {}, {})

        assert '활력' in keywords or '건강' in keywords or '균형' in keywords

    def test_get_category_keywords_unknown(self):
        """Test keywords for unknown category."""
        from backend_ai.app.rendering.builders import get_category_keywords

        keywords = get_category_keywords('unknown', {}, {})

        assert keywords == []


class TestSignConstants:
    """Tests for SIGN_KO and other constants."""

    def test_sign_ko_has_all_signs(self):
        """Test SIGN_KO has all zodiac signs."""
        from backend_ai.app.rendering.builders import SIGN_KO

        signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

        for sign in signs:
            assert sign in SIGN_KO

    def test_mc_careers_defined(self):
        """Test MC_CAREERS has entries."""
        from backend_ai.app.rendering.builders import MC_CAREERS

        assert len(MC_CAREERS) == 12

    def test_venus_love_defined(self):
        """Test VENUS_LOVE has entries."""
        from backend_ai.app.rendering.builders import VENUS_LOVE

        assert len(VENUS_LOVE) == 12

    def test_asc_health_defined(self):
        """Test ASC_HEALTH has entries."""
        from backend_ai.app.rendering.builders import ASC_HEALTH

        assert len(ASC_HEALTH) == 12

    def test_pof_meanings_defined(self):
        """Test POF_MEANINGS has 12 houses."""
        from backend_ai.app.rendering.builders import POF_MEANINGS

        assert len(POF_MEANINGS) == 12
        for i in range(1, 13):
            assert i in POF_MEANINGS

    def test_element_health_defined(self):
        """Test ELEMENT_HEALTH has all elements."""
        from backend_ai.app.rendering.builders import ELEMENT_HEALTH

        elements = ["목", "화", "토", "금", "수"]
        for element in elements:
            assert element in ELEMENT_HEALTH
