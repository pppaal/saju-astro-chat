"""
Unit tests for Tarot Spread Loader module.

Tests:
- SpreadLoader class
- Spread loading and retrieval methods
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestSpreadLoaderInit:
    """Tests for SpreadLoader initialization."""

    def test_spread_loader_creation(self):
        """SpreadLoader should be instantiable."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        assert loader is not None

    def test_spread_loader_custom_dir(self):
        """SpreadLoader should accept custom directory."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader(spreads_dir="/nonexistent/path")
        assert loader.spreads_dir == "/nonexistent/path"

    def test_spread_loader_has_spreads_dict(self):
        """SpreadLoader should have spreads dict."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        assert hasattr(loader, 'spreads')
        assert isinstance(loader.spreads, dict)


class TestGetAvailableThemes:
    """Tests for get_available_themes method."""

    def test_get_themes_empty(self):
        """Should return empty list when no spreads loaded."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {}

        result = loader.get_available_themes()

        assert result == []

    def test_get_themes_with_data(self):
        """Should return list of theme names."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {
            'love': {'sub_topics': {}},
            'career': {'sub_topics': {}},
            'general': {'sub_topics': {}}
        }

        result = loader.get_available_themes()

        assert 'love' in result
        assert 'career' in result
        assert 'general' in result


class TestGetSubTopics:
    """Tests for get_sub_topics method."""

    def test_sub_topics_no_theme(self):
        """Should return empty list for nonexistent theme."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {}

        result = loader.get_sub_topics('nonexistent')

        assert result == []

    def test_sub_topics_with_data(self):
        """Should return formatted sub-topics list."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {
            'love': {
                'sub_topics': {
                    'crush': {
                        'title': 'Secret Crush',
                        'korean': '짝사랑',
                        'description': 'Reading about your crush',
                        'card_count': 3
                    },
                    'relationship': {
                        'title': 'Current Relationship',
                        'korean': '현재 관계',
                        'description': 'Reading about your relationship',
                        'card_count': 5
                    }
                }
            }
        }

        result = loader.get_sub_topics('love')

        assert len(result) == 2
        assert any(st['id'] == 'crush' for st in result)
        assert any(st['korean'] == '짝사랑' for st in result)


class TestGetSpread:
    """Tests for get_spread method."""

    def test_get_spread_no_theme(self):
        """Should return None for nonexistent theme."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {}

        result = loader.get_spread('nonexistent', 'topic')

        assert result is None

    def test_get_spread_no_sub_topic(self):
        """Should return None for nonexistent sub-topic."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {
            'love': {'sub_topics': {}}
        }

        result = loader.get_spread('love', 'nonexistent')

        assert result is None

    def test_get_spread_with_data(self):
        """Should return spread configuration."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {
            'love': {
                'sub_topics': {
                    'crush': {
                        'title': 'Secret Crush',
                        'card_count': 3,
                        'positions': ['Past', 'Present', 'Future']
                    }
                }
            }
        }

        result = loader.get_spread('love', 'crush')

        assert result is not None
        assert result['title'] == 'Secret Crush'
        assert result['card_count'] == 3


class TestGetSpreadInfo:
    """Tests for get_spread_info method."""

    def test_spread_info_no_spread(self):
        """Should return None when spread not found."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {}

        result = loader.get_spread_info('nonexistent', 'topic')

        assert result is None

    def test_spread_info_with_data(self):
        """Should return full spread info."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        loader.spreads = {
            'career': {
                'sub_topics': {
                    'job_search': {
                        'spread_name': 'Career Path',
                        'title': 'Job Search',
                        'korean': '취업 운세',
                        'description': 'Finding your path',
                        'card_count': 4,
                        'positions': [
                            {'name': 'Current', 'korean': '현재'},
                            {'name': 'Challenge', 'korean': '도전'},
                            {'name': 'Advice', 'korean': '조언'},
                            {'name': 'Outcome', 'korean': '결과'}
                        ]
                    }
                }
            }
        }

        result = loader.get_spread_info('career', 'job_search')

        assert result is not None
        assert result['theme'] == 'career'
        assert result['sub_topic'] == 'job_search'
        assert result['spread_name'] == 'Career Path'
        assert result['korean'] == '취업 운세'
        assert result['card_count'] == 4
        assert len(result['positions']) == 4


class TestSingletonPattern:
    """Tests for singleton pattern."""

    def test_get_spread_loader_singleton(self):
        """get_spread_loader should return singleton instance."""
        from backend_ai.app.tarot.spread_loader import get_spread_loader

        loader1 = get_spread_loader()
        loader2 = get_spread_loader()

        assert loader1 is loader2


class TestModuleExports:
    """Tests for module exports."""

    def test_spread_loader_importable(self):
        """SpreadLoader should be importable."""
        from backend_ai.app.tarot.spread_loader import SpreadLoader
        assert SpreadLoader is not None

    def test_get_spread_loader_importable(self):
        """get_spread_loader should be importable."""
        from backend_ai.app.tarot.spread_loader import get_spread_loader
        assert callable(get_spread_loader)
