"""
Unit tests for Tarot Rules Loader module.

Tests:
- AdvancedRulesLoader class
- Rule loading and retrieval methods
- Card combination finding
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestAdvancedRulesLoaderInit:
    """Tests for AdvancedRulesLoader initialization."""

    def test_rules_loader_creation(self):
        """AdvancedRulesLoader should be instantiable."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        assert loader is not None

    def test_rules_loader_custom_dir(self):
        """AdvancedRulesLoader should accept custom directory."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader(rules_dir="/nonexistent/path")
        assert loader.rules_dir == "/nonexistent/path"

    def test_rules_loader_has_attributes(self):
        """AdvancedRulesLoader should have expected attributes."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        assert hasattr(loader, 'combinations')
        assert hasattr(loader, 'timing_rules')
        assert hasattr(loader, 'court_profiles')
        assert hasattr(loader, 'elemental_dignities')
        assert hasattr(loader, 'numerology')
        assert hasattr(loader, 'chakra_connections')
        assert hasattr(loader, 'astrological_correspondences')


class TestCardNameToId:
    """Tests for _card_name_to_id method."""

    def test_major_arcana_conversion(self):
        """Major arcana should convert to MAJOR_N format."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        assert loader._card_name_to_id('The Fool') == 'MAJOR_0'
        assert loader._card_name_to_id('The Magician') == 'MAJOR_1'
        assert loader._card_name_to_id('Death') == 'MAJOR_13'

    def test_minor_arcana_conversion(self):
        """Minor arcana should convert to SUIT_N format."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        assert loader._card_name_to_id('Ace of Wands') == 'WANDS_1'
        assert loader._card_name_to_id('Three of Cups') == 'CUPS_3'
        assert loader._card_name_to_id('Ten of Swords') == 'SWORDS_10'

    def test_court_card_conversion(self):
        """Court cards should convert correctly."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        assert loader._card_name_to_id('Page of Pentacles') == 'PENTACLES_11'
        assert loader._card_name_to_id('Knight of Cups') == 'CUPS_12'
        assert loader._card_name_to_id('Queen of Wands') == 'WANDS_13'
        assert loader._card_name_to_id('King of Swords') == 'SWORDS_14'

    def test_unknown_card(self):
        """Unknown card should return None."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        assert loader._card_name_to_id('Unknown Card') is None

    def test_korean_card_alias_conversion(self):
        """Korean card names from pair CSV should map to card_id."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()

        # tarot_combinations.csv stores Korean aliases (e.g., 바보 for The Fool)
        assert loader._card_name_to_id('바보') == 'MAJOR_0'


class TestFindCardCombination:
    """Tests for find_card_combination method."""

    def test_find_combination_no_data(self):
        """Should return None when no combinations loaded."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.combinations = {}

        result = loader.find_card_combination(['The Fool', 'The Magician'])

        assert result is None

    def test_find_combination_with_data(self):
        """Should find combination when data exists."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.combinations = {
            'powerful_pairs': {
                'love': [
                    {
                        'cards': ['The Lovers', 'Two of Cups'],
                        'meaning': 'Perfect match',
                        'korean': '완벽한 궁합'
                    }
                ]
            }
        }

        result = loader.find_card_combination(['The Lovers', 'Two of Cups', 'The Star'])

        assert result is not None
        assert result['category'] == 'love'


class TestGetCourtCardProfile:
    """Tests for get_court_card_profile method."""

    def test_get_court_profile_no_data(self):
        """Should return None when no profiles loaded."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.court_profiles = {}

        result = loader.get_court_card_profile('Queen of Cups')

        assert result is None

    def test_get_court_profile_with_data(self):
        """Should return profile when data exists."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.court_profiles = {
            'queens': {
                'description': 'Queens represent mastery',
                'cards': {
                    'Queen of Cups': {
                        'personality': {'description': 'Emotional wisdom'}
                    }
                }
            }
        }

        result = loader.get_court_card_profile('Queen of Cups')

        assert result is not None
        assert result['rank'] == 'queens'


class TestGetTimingHint:
    """Tests for get_timing_hint method."""

    def test_timing_hint_no_data(self):
        """Should return None when no timing rules loaded."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.timing_rules = {}

        result = loader.get_timing_hint('The Sun')

        assert result is None

    def test_timing_hint_with_data(self):
        """Should return hint when data exists."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.timing_rules = {
            'card_timing_meanings': {
                'immediate': {
                    'cards': ['The Sun', 'The Star'],
                    'korean': '즉시',
                    'timeframe': '1-7 days'
                }
            }
        }

        result = loader.get_timing_hint('The Sun')

        assert result is not None
        assert '즉시' in result
        assert '1-7 days' in result


class TestAnalyzeElementalBalance:
    """Tests for analyze_elemental_balance method."""

    def test_elemental_balance_no_data(self):
        """Should return empty when no dignities loaded."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.elemental_dignities = {}

        result = loader.analyze_elemental_balance([])

        assert result == {}

    def test_elemental_balance_with_cards(self):
        """Should analyze element balance of cards."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.elemental_dignities = {
            'major_arcana_elements': {'cards': {}}
        }

        cards = [
            {'name': 'Ace of Wands'},
            {'name': 'Three of Cups'},
            {'name': 'Seven of Swords'}
        ]
        result = loader.analyze_elemental_balance(cards)

        assert 'element_count' in result
        assert result['element_count']['fire'] == 1
        assert result['element_count']['water'] == 1
        assert result['element_count']['air'] == 1
        assert result['element_count']['earth'] == 0
        assert result['dominant'] is not None
        assert 'earth' in result['missing']


class TestGetFollowupQuestions:
    """Tests for get_followup_questions method."""

    def test_followup_no_data(self):
        """Should return empty list when no questions loaded."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.followup_questions = {}

        result = loader.get_followup_questions('love')

        assert result == []

    def test_followup_with_list_data(self):
        """Should return questions from list."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.followup_questions = {
            'love': ['What are you looking for?', 'How do you feel?']
        }

        result = loader.get_followup_questions('love')

        assert len(result) == 2

    def test_followup_with_dict_data(self):
        """Should return questions from dict by sentiment."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        loader.followup_questions = {
            'career': {
                'positive': ['What opportunities do you see?'],
                'neutral': ['What is your current situation?'],
                'negative': ['What challenges are you facing?']
            }
        }

        result = loader.get_followup_questions('career', 'positive')

        assert 'opportunities' in result[0]


class TestPairInterpretationCoverage:
    """Tests for pair interpretation lookup/ranking/summaries."""

    def test_pair_interpretation_with_korean_names(self):
        """Korean card aliases should resolve pair interpretations."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        result = loader.find_card_pair_interpretation('바보', '마법사')

        assert result is not None
        assert result.get('card1_id') == 'MAJOR_0'
        assert result.get('card2_id') == 'MAJOR_1'
        assert result.get('pair_key')

    def test_rank_pair_interpretations_prefers_theme_field(self):
        """Ranking should prioritize rows with theme-specific content."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        sample = [
            {
                'pair_key': 'A||B',
                'card1': 'A',
                'card2': 'B',
                'love': '',
                'career': 'strong career signal',
                'finance': '',
                'advice': 'generic advice',
                'element_relation': 'supportive',
            },
            {
                'pair_key': 'C||D',
                'card1': 'C',
                'card2': 'D',
                'love': '',
                'career': '',
                'finance': '',
                'advice': 'generic advice',
                'element_relation': '',
            },
        ]

        ranked = loader.rank_card_pair_interpretations(sample, theme='career', limit=2)
        assert len(ranked) == 2
        assert ranked[0]['pair_key'] == 'A||B'

    def test_combination_summaries_include_special_or_pairs(self):
        """Summary builder should produce normalized items for response payload."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        summaries = loader.build_combination_summaries(
            ['The Fool', 'The Magician', 'The High Priestess'],
            theme='career',
            limit=5,
        )

        assert isinstance(summaries, list)
        assert len(summaries) >= 1
        first = summaries[0]
        assert 'type' in first
        assert 'cards' in first
        assert 'focus' in first


class TestSingletonPattern:
    """Tests for singleton pattern."""

    def test_get_rules_loader_singleton(self):
        """get_rules_loader should return singleton instance."""
        from backend_ai.app.tarot.rules_loader import get_rules_loader

        loader1 = get_rules_loader()
        loader2 = get_rules_loader()

        assert loader1 is loader2


class TestModuleExports:
    """Tests for module exports."""

    def test_advanced_rules_loader_importable(self):
        """AdvancedRulesLoader should be importable."""
        from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader
        assert AdvancedRulesLoader is not None

    def test_get_rules_loader_importable(self):
        """get_rules_loader should be importable."""
        from backend_ai.app.tarot.rules_loader import get_rules_loader
        assert callable(get_rules_loader)
