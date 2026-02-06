"""
Unit tests for Tarot Extractors module.

Tests:
- add_entry helper function
- Various extract_* functions for different rule categories
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAddEntry:
    """Tests for add_entry helper function."""

    def test_add_entry_basic(self):
        """add_entry should add entry to list."""
        from backend_ai.app.tarot_extractors import add_entry

        entries = []
        add_entry(entries, 'combinations', 'love', 'Test text', {'key': 'value'})

        assert len(entries) == 1
        assert entries[0]['category'] == 'combinations'
        assert entries[0]['subcategory'] == 'love'
        assert entries[0]['text'] == 'Test text'
        assert entries[0]['data'] == {'key': 'value'}

    def test_add_entry_empty_text(self):
        """add_entry should not add entry with empty text."""
        from backend_ai.app.tarot_extractors import add_entry

        entries = []
        add_entry(entries, 'combinations', 'love', '', {'key': 'value'})

        assert len(entries) == 0

    def test_add_entry_whitespace_text(self):
        """add_entry should not add entry with whitespace only."""
        from backend_ai.app.tarot_extractors import add_entry

        entries = []
        add_entry(entries, 'combinations', 'love', '   ', {'key': 'value'})

        assert len(entries) == 0

    def test_add_entry_strips_text(self):
        """add_entry should strip whitespace from text."""
        from backend_ai.app.tarot_extractors import add_entry

        entries = []
        add_entry(entries, 'test', 'sub', '  test text  ', {})

        assert entries[0]['text'] == 'test text'


class TestExtractCombinations:
    """Tests for extract_combinations function."""

    def test_extract_combinations_powerful_pairs(self):
        """Should extract powerful pairs."""
        from backend_ai.app.tarot_extractors import extract_combinations

        entries = []
        data = {
            'powerful_pairs': {
                'love': [
                    {'cards': ['The Lovers', 'Two of Cups'], 'meaning': 'Perfect match'}
                ]
            }
        }
        extract_combinations(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('The Lovers' in e['text'] for e in entries)

    def test_extract_combinations_triple(self):
        """Should extract triple combinations."""
        from backend_ai.app.tarot_extractors import extract_combinations

        entries = []
        data = {
            'triple_combinations': {
                'trinity': {
                    'cards': ['The Fool', 'The World', 'Wheel of Fortune'],
                    'meaning': 'Complete cycle'
                }
            }
        }
        extract_combinations(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('trinity' in e['text'] for e in entries)

    def test_extract_combinations_empty(self):
        """Should handle empty data."""
        from backend_ai.app.tarot_extractors import extract_combinations

        entries = []
        extract_combinations(entries, {}, 'test.json')

        assert len(entries) == 0


class TestExtractTiming:
    """Tests for extract_timing function."""

    def test_extract_timing_seasons(self):
        """Should extract seasons timing."""
        from backend_ai.app.tarot_extractors import extract_timing

        entries = []
        data = {
            'seasons': {
                'spring': {'korean': '봄', 'meaning': 'New beginnings'}
            }
        }
        extract_timing(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('봄' in e['text'] for e in entries)

    def test_extract_timing_card_timing(self):
        """Should extract card timing meanings."""
        from backend_ai.app.tarot_extractors import extract_timing

        entries = []
        data = {
            'card_timing_meanings': {
                'immediate': {
                    'cards': ['The Sun'],
                    'korean': '즉시',
                    'timeframe': '1-7 days'
                }
            }
        }
        extract_timing(entries, data, 'test.json')

        assert len(entries) >= 1


class TestExtractCourtProfiles:
    """Tests for extract_court_profiles function."""

    def test_extract_court_profiles(self):
        """Should extract court card profiles."""
        from backend_ai.app.tarot_extractors import extract_court_profiles

        entries = []
        data = {
            'queens': {
                'cards': {
                    'Queen of Cups': {
                        'personality': {
                            'description': 'Emotional wisdom',
                            'strengths': ['Intuition', 'Empathy']
                        }
                    }
                }
            }
        }
        extract_court_profiles(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('Queen of Cups' in e['text'] for e in entries)


class TestExtractElements:
    """Tests for extract_elements function."""

    def test_extract_elements(self):
        """Should extract element interactions."""
        from backend_ai.app.tarot_extractors import extract_elements

        entries = []
        data = {
            'element_interactions': {
                'fire_water': {
                    'korean': '불과 물',
                    'description': 'Opposing forces',
                    'advice': 'Find balance'
                }
            }
        }
        extract_elements(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('불과 물' in e['text'] for e in entries)


class TestExtractNumerology:
    """Tests for extract_numerology function."""

    def test_extract_numerology(self):
        """Should extract numerology meanings."""
        from backend_ai.app.tarot_extractors import extract_numerology

        entries = []
        data = {
            'number_meanings': {
                '1': {
                    'korean': '일',
                    'meaning': 'New beginnings',
                    'tarot_connection': 'Aces, The Magician'
                }
            }
        }
        extract_numerology(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('일' in e['text'] for e in entries)


class TestExtractColors:
    """Tests for extract_colors function."""

    def test_extract_colors(self):
        """Should extract color symbolism."""
        from backend_ai.app.tarot_extractors import extract_colors

        entries = []
        data = {
            'primary_colors': {
                'red': {
                    'korean': '빨강',
                    'meaning': 'Passion',
                    'emotional': 'Energy'
                }
            }
        }
        extract_colors(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('빨강' in e['text'] for e in entries)


class TestExtractMeditations:
    """Tests for extract_meditations function."""

    def test_extract_meditations(self):
        """Should extract meditation entries."""
        from backend_ai.app.tarot_extractors import extract_meditations

        entries = []
        data = {
            'major_arcana_meditations': {
                'The Fool': {
                    'theme': 'New journey',
                    'affirmation': 'I embrace the unknown'
                }
            }
        }
        extract_meditations(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('The Fool' in e['text'] for e in entries)


class TestExtractLucky:
    """Tests for extract_lucky function."""

    def test_extract_lucky(self):
        """Should extract lucky items."""
        from backend_ai.app.tarot_extractors import extract_lucky

        entries = []
        data = {
            'card_lucky_items': {
                'The Star': {
                    'lucky_color': 'Blue',
                    'lucky_number': '17',
                    'crystal': 'Aquamarine'
                }
            }
        }
        extract_lucky(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('The Star' in e['text'] for e in entries)


class TestExtractFollowups:
    """Tests for extract_followups function."""

    def test_extract_followups(self):
        """Should extract followup questions."""
        from backend_ai.app.tarot_extractors import extract_followups

        entries = []
        data = {
            'by_theme': {
                'love': {
                    'general': ['What do you seek?', 'How do you feel?']
                }
            }
        }
        extract_followups(entries, data, 'test.json')

        assert len(entries) >= 1


class TestExtractReversed:
    """Tests for extract_reversed function."""

    def test_extract_reversed_major(self):
        """Should extract reversed major arcana."""
        from backend_ai.app.tarot_extractors import extract_reversed

        entries = []
        data = {
            'reversed_major_arcana_special': {
                'The Tower': {
                    'special_meaning': 'Internal transformation',
                    'advice': 'Embrace change'
                }
            }
        }
        extract_reversed(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('The Tower' in e['text'] for e in entries)


class TestExtractChakras:
    """Tests for extract_chakras function."""

    def test_extract_chakras(self):
        """Should extract chakra connections."""
        from backend_ai.app.tarot_extractors import extract_chakras

        entries = []
        data = {
            'chakras': {
                'root': {
                    'korean': '뿌리 차크라',
                    'theme': 'Grounding',
                    'balanced': 'Feeling secure',
                    'cards': ['The Emperor', 'Four of Pentacles']
                }
            }
        }
        extract_chakras(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('뿌리 차크라' in e['text'] for e in entries)


class TestExtractAstrology:
    """Tests for extract_astrology function."""

    def test_extract_astrology(self):
        """Should extract astrology correspondences."""
        from backend_ai.app.tarot_extractors import extract_astrology

        entries = []
        data = {
            'major_arcana_astrology': {
                'The Sun': {
                    'korean_planet': '태양',
                    'meaning': 'Vitality and success'
                }
            }
        }
        extract_astrology(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('태양' in e['text'] for e in entries)


class TestExtractYesNo:
    """Tests for extract_yesno function."""

    def test_extract_yesno_values(self):
        """Should extract yes/no card values."""
        from backend_ai.app.tarot_extractors import extract_yesno

        entries = []
        data = {
            'card_values': {
                'strong_yes': {
                    'cards': ['The Sun', 'The World'],
                    'meaning': 'Definitely yes'
                }
            }
        }
        extract_yesno(entries, data, 'test.json')

        assert len(entries) >= 1

    def test_extract_yesno_combos(self):
        """Should extract special combinations."""
        from backend_ai.app.tarot_extractors import extract_yesno

        entries = []
        data = {
            'special_combinations': {
                'certain_yes': [
                    {'combo': ['The Sun', 'The Star'], 'meaning': 'Absolute yes'}
                ]
            }
        }
        extract_yesno(entries, data, 'test.json')

        assert len(entries) >= 1


class TestExtractSoulmate:
    """Tests for extract_soulmate function."""

    def test_extract_soulmate_types(self):
        """Should extract connection types."""
        from backend_ai.app.tarot_extractors import extract_soulmate

        entries = []
        data = {
            'connection_types': {
                'twin_flame': {
                    'korean': '쌍둥이 불꽃',
                    'description': 'Mirror souls',
                    'characteristics': ['Intense', 'Transformative']
                }
            }
        }
        extract_soulmate(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('쌍둥이 불꽃' in e['text'] for e in entries)


class TestExtractShadow:
    """Tests for extract_shadow function."""

    def test_extract_shadow(self):
        """Should extract shadow work entries."""
        from backend_ai.app.tarot_extractors import extract_shadow

        entries = []
        data = {
            'major_arcana_shadows': {
                'The Devil': {
                    'shadow': 'Addiction',
                    'light': 'Freedom',
                    'journal_prompt': 'What binds you?'
                }
            }
        }
        extract_shadow(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('The Devil' in e['text'] for e in entries)


class TestExtractMoon:
    """Tests for extract_moon function."""

    def test_extract_moon_phases(self):
        """Should extract moon phase entries."""
        from backend_ai.app.tarot_extractors import extract_moon

        entries = []
        data = {
            'moon_phases': {
                'full_moon': {
                    'korean': '보름달',
                    'energy': 'Completion',
                    'best_questions': ['What has come to fruition?']
                }
            }
        }
        extract_moon(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('보름달' in e['text'] for e in entries)

    def test_extract_moon_zodiac(self):
        """Should extract moon in zodiac entries."""
        from backend_ai.app.tarot_extractors import extract_moon

        entries = []
        data = {
            'moon_in_zodiac': {
                'aries': {
                    'korean': '양자리',
                    'energy': 'Initiative',
                    'best_for': 'Starting new projects'
                }
            }
        }
        extract_moon(entries, data, 'test.json')

        assert len(entries) >= 1


class TestExtractAnimals:
    """Tests for extract_animals function."""

    def test_extract_animals(self):
        """Should extract spirit animal entries."""
        from backend_ai.app.tarot_extractors import extract_animals

        entries = []
        data = {
            'major_arcana_animals': {
                'The Empress': {
                    'korean_animal': '비둘기',
                    'meaning': 'Peace and fertility',
                    'message': 'Nurture yourself'
                }
            }
        }
        extract_animals(entries, data, 'test.json')

        assert len(entries) >= 1
        assert any('비둘기' in e['text'] for e in entries)


class TestFileHandlers:
    """Tests for FILE_HANDLERS mapping."""

    def test_file_handlers_exists(self):
        """FILE_HANDLERS should exist."""
        from backend_ai.app.tarot_extractors import FILE_HANDLERS

        assert FILE_HANDLERS is not None
        assert isinstance(FILE_HANDLERS, dict)

    def test_file_handlers_has_entries(self):
        """FILE_HANDLERS should have expected entries."""
        from backend_ai.app.tarot_extractors import FILE_HANDLERS

        assert 'card_combinations.json' in FILE_HANDLERS
        assert 'timing_rules.json' in FILE_HANDLERS
        assert 'court_card_profiles.json' in FILE_HANDLERS
        assert 'numerology.json' in FILE_HANDLERS

    def test_file_handlers_are_callable(self):
        """FILE_HANDLERS values should be callable."""
        from backend_ai.app.tarot_extractors import FILE_HANDLERS

        for filename, handler in FILE_HANDLERS.items():
            assert callable(handler), f"Handler for {filename} should be callable"


class TestModuleExports:
    """Tests for module exports."""

    def test_add_entry_importable(self):
        """add_entry should be importable."""
        from backend_ai.app.tarot_extractors import add_entry
        assert callable(add_entry)

    def test_extract_functions_importable(self):
        """Extract functions should be importable."""
        from backend_ai.app.tarot_extractors import (
            extract_combinations,
            extract_timing,
            extract_court_profiles,
            extract_elements,
            extract_numerology,
        )
        assert callable(extract_combinations)
        assert callable(extract_timing)
        assert callable(extract_court_profiles)
        assert callable(extract_elements)
        assert callable(extract_numerology)
